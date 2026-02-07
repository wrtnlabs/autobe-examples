import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_duration_analytics_filtered_by_permanent_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test filtering by permanent bans
  const permanentResponse =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentResponse);
  // Test filtering by temporary bans
  const temporaryResponse =
    await api.functional.discussionBoard.admin.analytics.ban_durations.index(
      adminConnection,
      {
        body: {
          is_permanent: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(temporaryResponse);
  // Validate that filtered responses contain only the correct ban types
  TestValidator.predicate(
    "permanent filter returns only permanent bans",
    permanentResponse.data.every((item) => item.is_permanent === true),
  );
  TestValidator.predicate(
    "temporary filter returns only temporary bans",
    temporaryResponse.data.every((item) => item.is_permanent === false),
  );
  // Validate pagination structure
  TestValidator.predicate(
    "permanent response has pagination",
    permanentResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "temporary response has pagination",
    temporaryResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "permanent pagination has valid current page",
    permanentResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "temporary pagination has valid current page",
    temporaryResponse.pagination.current >= 0,
  );
}
