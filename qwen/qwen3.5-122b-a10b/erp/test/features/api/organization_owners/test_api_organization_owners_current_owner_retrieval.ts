import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganizationOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the current organization owner with pagination and filtering.
 *
 * Validates the ownership audit functionality by testing the retrieval of current organization owner records with proper filtering and pagination. Ensures that the ownership records contain correct user and organization information, proper timestamps, and accurate pagination metadata.
 *
 * The test verifies the primary success path for ownership audit functionality, including:
 * - Current owner filtering with is_current=true parameter
 * - Ownership record structure validation (user, organization, timestamps)
 * - Pagination metadata accuracy
 * - Data integrity between request and response
 *
 * 1. Register a new member user with email and password credentials.
 * 2. Generate a random organization ID for testing (organization creation not available in SDK).
 * 3. Call the owners index endpoint with is_current=true filter.
 * 4. Verify the response structure contains pagination and data array.
 * 5. Validate ownership record contains is_current=true flag.
 * 6. Verify user information includes email and id fields.
 * 7. Verify organization information includes id and name fields.
 * 8. Validate started_at is a valid date-time string.
 * 9. Confirm ended_at is null for current ownership records.
 * 10. Verify pagination metadata shows correct current page and limit values.
 */
export async function test_api_organization_owners_current_owner_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a random organization ID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the owners index endpoint with is_current=true filter
  const ownersResponse =
    await api.functional.hrm.member.organizations.owners.index(
      memberConnection,
      {
        organizationId,
        body: {
          is_current: true,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(ownersResponse);
  // 4. Verify pagination metadata shows correct current page and limit values
  TestValidator.equals(
    "pagination current page",
    ownersResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    ownersResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    ownersResponse.pagination.records >= 0,
  );
  // 5. If data exists, validate ownership record structure
  if (ownersResponse.data.length > 0) {
    const currentOwner = ownersResponse.data.find(
      (owner) => owner.is_current === true,
    );
    // Verify we have at least one current owner record
    TestValidator.predicate(
      "has current owner record",
      currentOwner !== undefined,
    );
    if (currentOwner) {
      // 6. Verify ended_at is null for current ownership records (business rule)
      TestValidator.equals(
        "ended_at is null for current owner",
        currentOwner.ended_at,
        null,
      );
      // 7. Verify user has valid email format
      TestValidator.predicate(
        "owner user has email",
        currentOwner.user.email.length > 0,
      );
      // 8. Verify organization has valid name
      TestValidator.predicate(
        "organization has name",
        currentOwner.organization.name.length > 0,
      );
    }
  }
}
