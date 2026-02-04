import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_report_statuses_retrieval(
  connection: api.IConnection,
) {
  const email = typia.random<
    string & tags.MinLength<5> & tags.MaxLength<254> & tags.Format<"email">
  >();
  const user = await authorize_user_join(connection, {
    body: {
      email: email,
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: email,
      password: "password123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    },
  });
  const response =
    await api.functional.communityPlatform.user.report_statuses.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "statusName",
          order: "asc",
        } satisfies ICommunityPlatformReportStatus.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "response should not be empty",
    response.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "pagination must have current page 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination must have limit 10",
    response.pagination.limit,
    10,
  );
}
