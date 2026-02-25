import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_appeals_search_empty_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Search ban appeals with empty filter parameters
  const response = await api.functional.discussionBoard.admin.appeals.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardBanAppeal.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    (response.pagination as any).current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    (response.pagination as any).limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    (response.pagination as any).records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    (response.pagination as any).pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each appeal summary
  for (const appeal of response.data) {
    typia.assert(appeal);
    // Validate appeal fields exist (typia.assert already validates types)
    TestValidator.predicate(
      "appeal has id",
      typeof appeal.id === "string" && appeal.id.length > 0,
    );
    TestValidator.predicate(
      "appeal has appeal_reason",
      typeof appeal.appeal_reason === "string",
    );
    TestValidator.predicate(
      "appeal has status",
      typeof appeal.status === "string",
    );
    TestValidator.predicate(
      "appeal has appealed_at",
      typeof appeal.appealed_at === "string" && appeal.appealed_at.length > 0,
    );
    TestValidator.predicate(
      "appeal has reviewed_at",
      appeal.reviewed_at === null ||
        (typeof appeal.reviewed_at === "string" &&
          appeal.reviewed_at.length > 0),
    );
    // Validate nested user structure
    typia.assert(appeal.user);
    TestValidator.predicate(
      "user has id",
      typeof appeal.user.id === "string" && appeal.user.id.length > 0,
    );
    TestValidator.predicate(
      "user has display_name",
      typeof appeal.user.display_name === "string" &&
        appeal.user.display_name.length > 0,
    );
    TestValidator.predicate(
      "user has bio",
      appeal.user.bio === null || typeof appeal.user.bio === "string",
    );
    TestValidator.predicate(
      "user has created_at",
      typeof appeal.user.created_at === "string" &&
        appeal.user.created_at.length > 0,
    );
  }
}