import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderated_content_histories_filter_by_content_type(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create another administrator for moderator filtering
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_admin_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(moderatorAuth);
  // Search for moderation history filtered by content_type='article' and specific moderator_admin_id
  const limitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const pageValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const searchRequest = {
    content_type: "article",
    moderator_admin_id: moderatorAuth.id,
    limit: limitValue,
    page: pageValue,
  } satisfies IDiscussionBoardModeratedContentHistory.IRequest;
  const response =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate each record meets the filter criteria
  for (const record of response.data) {
    TestValidator.equals(
      "content_type is article",
      record.content_type,
      "article",
    );
    if (
      record.moderator_admin !== null &&
      record.moderator_admin !== undefined
    ) {
      TestValidator.equals(
        "moderator_admin_id matches",
        record.moderator_admin.id,
        moderatorAuth.id,
      );
    }
    // For article content_type, moderated_comment should be null
    TestValidator.equals(
      "moderated_comment is null for article content",
      record.moderated_comment,
      null,
    );
    // Validate pagination values
    TestValidator.predicate(
      "pagination current is valid",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit matches request",
      response.pagination.limit === limitValue,
    );
    TestValidator.predicate(
      "pagination records is valid",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is valid",
      response.pagination.pages >= 0,
    );
  }
}
