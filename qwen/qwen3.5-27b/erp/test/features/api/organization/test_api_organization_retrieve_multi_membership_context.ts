import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test organization retrieval when member belongs to multiple organizations, verifying proper data isolation and context handling.
 *
 * Validates that a member can retrieve organization data from multiple organizations they belong to, ensuring proper data isolation and complete entity retrieval. The test creates two organizations under the same member account and verifies that each organization can be independently retrieved with all its data intact.
 *
 * Special attention is given to verifying that organization retrieval returns complete entity data including all identity, operational, and fiscal configuration fields, and that the member has access to all organizations they created regardless of creation order or current context.
 *
 * 1. Register a new member account via POST /hrmTimeTrack/auth/member/join
 * 2. Create first organization (Org A) via POST /hrmTimeTrack/member/organizations
 * 3. Create second organization (Org B) via POST /hrmTimeTrack/member/organizations
 * 4. Retrieve Org A via GET /hrmTimeTrack/member/organizations/{organizationId}
 * 5. Retrieve Org B via GET /hrmTimeTrack/member/organizations/{organizationId}
 * 6. Validate both organizations match their creation data
 * 7. Verify organizations are distinct from each other
 */
export async function test_api_organization_retrieve_multi_membership_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create first organization (Org A)
  const orgA = await generate_random_hrm_time_track_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Organization A",
      },
    },
  );
  typia.assert(orgA);
  // 3. Create second organization (Org B)
  const orgB = await generate_random_hrm_time_track_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Organization B",
      },
    },
  );
  typia.assert(orgB);
  // 4. Retrieve Org A by ID
  const retrievedOrgA =
    await api.functional.hrmTimeTrack.member.organizations.at(
      memberConnection,
      {
        organizationId: orgA.id,
      },
    );
  typia.assert(retrievedOrgA);
  // 5. Retrieve Org B by ID
  const retrievedOrgB =
    await api.functional.hrmTimeTrack.member.organizations.at(
      memberConnection,
      {
        organizationId: orgB.id,
      },
    );
  typia.assert(retrievedOrgB);
  // 6. Validate Org A retrieval
  TestValidator.equals(
    "Org A name matches input",
    retrievedOrgA.name,
    "Organization A",
  );
  TestValidator.equals("Org A ID matches", retrievedOrgA.id, orgA.id);
  // 7. Validate Org B retrieval
  TestValidator.equals(
    "Org B name matches input",
    retrievedOrgB.name,
    "Organization B",
  );
  TestValidator.equals("Org B ID matches", retrievedOrgB.id, orgB.id);
  // 8. Verify organizations are distinct
  TestValidator.notEquals(
    "Org A and Org B have different IDs",
    retrievedOrgA.id,
    retrievedOrgB.id,
  );
  TestValidator.notEquals(
    "Org A and Org B have different names",
    retrievedOrgA.name,
    retrievedOrgB.name,
  );
  // 9. Verify member can access both organizations (multi-membership)
  TestValidator.predicate(
    "member can access Org A",
    retrievedOrgA.id === orgA.id,
  );
  TestValidator.predicate(
    "member can access Org B",
    retrievedOrgB.id === orgB.id,
  );
}
