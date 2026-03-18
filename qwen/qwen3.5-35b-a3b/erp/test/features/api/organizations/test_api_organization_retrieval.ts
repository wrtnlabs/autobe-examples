import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create member-specific connection using the JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: `Bearer ${authorizedMember.token.access}`,
  };
  // 3. Retrieve organizations list for the authenticated member
  const organizationsResponse =
    await api.functional.hrms.member.organizations.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(organizationsResponse);
  // 4. Validate pagination metadata
  typia.assert(organizationsResponse.pagination);
  const pagination = organizationsResponse.pagination;
  TestValidator.predicate(
    "pagination has current page",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", pagination.limit > 0);
  TestValidator.predicate(
    "pagination has records count",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages count", pagination.pages >= 0);
  // 5. Verify at least one organization is returned
  TestValidator.predicate(
    "member has at least one organization",
    organizationsResponse.data.length > 0,
  );
  // 6. Validate organization summary structure
  for (const org of organizationsResponse.data) {
    typia.assert(org);
    typia.assert(org.id);
    typia.assert(org.name);
    typia.assert(org.currency);
    typia.assert(org.timezone);
    typia.assert(org.fiscal_start_month);
    typia.assert(org.owner);
    typia.assert(org.created_at);
    typia.assert(org.updated_at);
  }
}
