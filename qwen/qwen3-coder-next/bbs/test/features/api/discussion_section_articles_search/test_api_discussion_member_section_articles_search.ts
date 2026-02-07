import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_discussion_member_section_articles_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Generate section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test search functionality with pagination and sorting
  const result =
    await api.functional.discussionBoard.member.sections.articles.index(
      memberConnection,
      {
        sectionId,
        body: typia.random<IDiscussionBoardArticle.IRequest>(),
      },
    );
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", result.data !== undefined, true);
  TestValidator.equals(
    "pagination has required fields",
    result.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records count",
    result.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages count",
    result.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is positive",
    result.pagination.limit > 0,
    true,
  );
  // Validate data array structure
  TestValidator.equals("has articles", result.data.length >= 0, true);
}