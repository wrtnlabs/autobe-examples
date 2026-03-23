import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_organizations_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Test pagination parameters with default values
  const page1 = await api.functional.hrmTracker.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTrackerOrganization.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination structure
  TestValidator.equals("page 1 has pagination", page1.pagination.current, 1);
  TestValidator.equals("page 1 has limit", page1.pagination.limit, 10);
  // 3. Test different pagination values
  const page2 = await api.functional.hrmTracker.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IHrmTrackerOrganization.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 has correct limit", page2.pagination.limit, 5);
  // 4. Test name search filter
  const searchByName =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          name: "TestOrg",
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(searchByName);
  // 5. Test status filter
  const searchByStatus =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          status: "active",
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(searchByStatus);
  // 6. Test combination of filters and pagination
  const combined = await api.functional.hrmTracker.member.organizations.index(
    memberConnection,
    {
      body: {
        name: "Test",
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IHrmTrackerOrganization.IRequest,
    },
  );
  typia.assert(combined);
}
