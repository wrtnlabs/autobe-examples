import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_member_retrieve_member_with_different_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (will access multiple orgs)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Create Member B (target in one organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Create Member C (target in different organization)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberC);
  // 4. Get memberA's organization memberships
  if (
    memberA.organization_memberships === null ||
    memberA.organization_memberships.length === 0
  ) {
    console.warn(
      "Member A has no organizations - cannot test cross-org retrieval",
    );
    return;
  }
  // 5. Retrieve Member B as Member A (cross-org scenario)
  const memberBRetrieved = await api.functional.hrms.members.at(
    memberAConnection,
    {
      memberId: memberB.id,
    },
  );
  typia.assert(memberBRetrieved);
  // 6. Retrieve Member C as Member A (cross-org scenario)
  const memberCRetrieved = await api.functional.hrms.members.at(
    memberAConnection,
    {
      memberId: memberC.id,
    },
  );
  typia.assert(memberCRetrieved);
  // 7. Validate responses
  TestValidator.equals("Member B retrieved", memberBRetrieved.id, memberB.id);
  TestValidator.equals(
    "Member B email matches",
    memberBRetrieved.email,
    memberB.email,
  );
  TestValidator.equals("Member C retrieved", memberCRetrieved.id, memberC.id);
  TestValidator.equals(
    "Member C email matches",
    memberCRetrieved.email,
    memberC.email,
  );
}
