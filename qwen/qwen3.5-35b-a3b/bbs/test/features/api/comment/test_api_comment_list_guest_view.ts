import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_list_guest_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Fetch comments for an article (using random UUID - assumes test DB has sample articles)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch comments for the article with default pagination and sorting
  const response =
    await api.functional.economicPoliticalBoard.guest.articles.comments.index(
      guestConnection,
      {
        articleId,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardComment.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure exists and has valid values
  TestValidator.predicate(
    "pagination has valid current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // 5. Validate comments are sorted by created_at ascending (oldest first)
  const commentCount = response.data.length;
  for (let i = 1; i < commentCount; i++) {
    const prevComment = response.data[i - 1];
    const currComment = response.data[i];
    TestValidator.predicate(
      `comments sorted ascending (index ${i})`,
      new Date(prevComment.created_at) <= new Date(currComment.created_at),
    );
  }
  // 6. Validate each comment has correct structure and content
  for (const comment of response.data) {
    typia.assert(comment);
    // Validate id is valid UUID
    TestValidator.predicate(
      "comment id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.id,
      ),
    );
    // Validate author object structure
    TestValidator.equals(
      "author has userId",
      typeof comment.author.userId,
      "string",
    );
    TestValidator.predicate(
      "author has valid grade",
      ["regular", "super"].includes(comment.author.grade),
    );
    TestValidator.equals(
      "author has user object",
      typeof comment.author.user,
      "object",
    );
    // Validate user object structure within author
    TestValidator.equals(
      "author user has id",
      typeof comment.author.user.id,
      "string",
    );
    TestValidator.equals(
      "author user has email",
      typeof comment.author.user.email,
      "string",
    );
    TestValidator.equals(
      "author user has displayName",
      typeof comment.author.user.displayName,
      "string",
    );
    TestValidator.equals(
      "author user has bio",
      typeof comment.author.user.bio,
      "string",
    );
    // Validate content exists and is string
    TestValidator.predicate(
      "comment has content",
      typeof comment.content === "string",
    );
    // Validate timestamps are valid date-time
    TestValidator.predicate(
      "comment has valid created_at",
      new Date(comment.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "comment has valid updated_at",
      new Date(comment.updated_at).getTime() > 0,
    );
    // Validate deleted_at is null for active comments (soft delete filter)
    TestValidator.equals(
      "comment is active (deleted_at null)",
      comment.deleted_at,
      null,
    );
    // Validate author user display name exists and is not empty
    TestValidator.predicate(
      "author user display name is not empty",
      comment.author.user.displayName.length > 0,
    );
  }
  // 7. Validate pagination metadata is accurate
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    expectedPages satisfies number as number,
  );
}
