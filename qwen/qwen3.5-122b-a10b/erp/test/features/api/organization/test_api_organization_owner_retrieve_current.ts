import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization owner record retrieval by authenticated member.
 *
 * Validates that a member who has joined an organization can successfully retrieve their own owner record through the member-scoped owner endpoint. The test verifies the complete ownership record structure including ownership metadata and embedded user profile information.
 *
 * 1. Member registers with email and password via join endpoint.
 * 2. Join response includes organization information.
 * 3. Member authenticates with the returned token.
 * 4. Retrieve owner record using organizationId from join response and memberId as ownerId.
 * 5. Validate ownership metadata (is_current=true, ended_at=null).
 * 6. Validate user profile information matches the registered member.
 */
export async function test_api_organization_owner_retrieve_current(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and creates organization with owner record
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(joinOutput);
  // 2. Extract organization identifier from join response
  if (!joinOutput.organizations || joinOutput.organizations.length === 0) {
    throw new Error("Join response must include at least one organization");
  }
  const organizationId: string & tags.Format<"uuid"> =
    joinOutput.organizations[0].id;
  // 3. Retrieve the current owner record using member ID as owner identifier
  // The ownership record is created during join, and member ID serves as the
  // owner identifier for the current owner lookup
  const ownerRecord: IHrmOrganizationOwner =
    await api.functional.hrm.member.organizations.owners.at(memberConnection, {
      organizationId,
      ownerId: joinOutput.id,
    });
  typia.assert(ownerRecord);
  // 4. Validate ownership metadata
  TestValidator.equals("owner record is current", ownerRecord.is_current, true);
  TestValidator.equals(
    "current owner has no end date",
    ownerRecord.ended_at,
    null,
  );
  TestValidator.predicate(
    "owner record has start date",
    ownerRecord.started_at !== null && ownerRecord.started_at !== undefined,
  );
  // 5. Validate user profile information
  TestValidator.equals(
    "owner user id matches member id",
    ownerRecord.user.id,
    joinOutput.id,
  );
  TestValidator.equals(
    "owner user email matches member email",
    ownerRecord.user.email,
    joinOutput.email,
  );
  TestValidator.predicate(
    "owner user has created_at timestamp",
    ownerRecord.user.created_at !== null &&
      ownerRecord.user.created_at !== undefined,
  );
  TestValidator.predicate(
    "owner user has updated_at timestamp",
    ownerRecord.user.updated_at !== null &&
      ownerRecord.user.updated_at !== undefined,
  );
}
