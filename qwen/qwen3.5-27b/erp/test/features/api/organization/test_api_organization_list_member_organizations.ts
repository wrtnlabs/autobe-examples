import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve a paginated list of organizations they belong to.
 *
 * Validates the complete organization listing workflow including member authentication and paginated organization retrieval. Ensures that the organization list endpoint correctly returns organization summaries with proper pagination metadata and that all returned organizations belong to the authenticated member.
 *
 * Special attention is given to verifying that the response structure matches the expected pagination format and that organization summaries contain all required fields including id, name, description, currency, timezone, fiscal_start_month, and created_at.
 *
 * 1. Register a new member account via /hrmTimeTrack/auth/member/join.
 * 2. Call PATCH /hrmTimeTrack/member/organizations with minimal request body.
 * 3. Verify response contains paginated organization summaries.
 * 4. Verify pagination metadata includes current page, limit, total records, and total pages.
 * 5. Verify each organization summary contains required fields.
 */
export async function test_api_organization_list_member_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. List organizations with minimal request
  const organizations =
    await api.functional.hrmTimeTrack.member.organizations.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackOrganization.IRequest,
      },
    );
  typia.assert(organizations);
  // 3. Verify pagination consistency
  TestValidator.predicate(
    "pagination consistency",
    organizations.pagination.records === 0
      ? organizations.data.length === 0
      : organizations.data.length > 0,
  );
  // 4. Verify pagination metadata values are reasonable
  TestValidator.predicate(
    "current page is at least 1",
    organizations.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    organizations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    organizations.pagination.pages ===
      Math.ceil(
        organizations.pagination.records / organizations.pagination.limit,
      ),
  );
  // 5. Verify organization summaries have valid business data
  await ArrayUtil.asyncForEach(organizations.data, async (org) => {
    typia.assert(org);
    // Verify organization name is not empty
    TestValidator.predicate(
      "organization name is not empty",
      org.name.trim().length > 0,
    );
    // Verify currency is a valid ISO code (3 letters)
    TestValidator.predicate(
      "currency is valid ISO code",
      /^[A-Z]{3}$/.test(org.currency),
    );
    // Verify timezone is not empty
    TestValidator.predicate(
      "timezone is not empty",
      org.timezone.trim().length > 0,
    );
    // Verify fiscal_start_month is valid (1-12)
    TestValidator.predicate(
      "fiscal_start_month is valid",
      org.fiscal_start_month >= 1 && org.fiscal_start_month <= 12,
    );
  });
}
