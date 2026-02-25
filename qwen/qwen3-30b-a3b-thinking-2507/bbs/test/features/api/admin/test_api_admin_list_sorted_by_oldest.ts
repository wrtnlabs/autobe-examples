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

export async function test_api_admin_list_sorted_by_oldest(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  await authorize_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
    },
  );
  await authorize_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
    },
  );
  const result =
    await api.functional.economicPoliticalDiscussionBoard.admin.admins.index(
      adminConnection,
      {
        body: {
          sort: "oldest",
        } satisfies IEconomicPoliticalDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(result);
  const expected = result.data
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  TestValidator.index(
    "admin list sorted by oldest",
    expected,
    result.data,
    true,
  );
}
