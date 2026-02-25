import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // 2. Call admin list endpoint with default parameters
  const adminList =
    await api.functional.economicPoliticalDiscussionBoard.admin.admins.index(
      adminConnection,
      {
        body: {
          limit: 20,
          sort: "newest",
        } satisfies IEconomicPoliticalDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(adminList);
  // 3. Validate response structure
  TestValidator.predicate("admin list has data", Array.isArray(adminList.data));
  TestValidator.predicate(
    "admin list has pagination",
    !!adminList.pagination && typeof adminList.pagination === "object",
  );
  // 4. Ensure data array contains correct structure
  for (const admin of adminList.data) {
    TestValidator.equals("ID matches format", admin.id, admin.id);
    TestValidator.equals("Email is string", typeof admin.email, "string");
    TestValidator.equals(
      "Role is one of expected values",
      ["user", "admin", "super-admin"].includes(admin.role),
      true,
    );
    TestValidator.equals(
      "Creation date is ISO string",
      admin.created_at,
      admin.created_at,
    );
  }
}
