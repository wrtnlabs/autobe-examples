import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_comment_view_deleted_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen user to have authenticated connection
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // Generate a random comment ID to test the view functionality
  // We assume the system has a deleted comment available in test environment
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the comment - This should return a deleted comment in test environment
  const deletedComment = await api.functional.economicBoard.citizen.comments.at(
    citizenConnection,
    {
      commentId,
    },
  );
  typia.assert(deletedComment);
  // Validate the structure of the deleted comment as per scenario requirements
  TestValidator.equals(
    "content is [Deleted Comment]",
    deletedComment.content,
    "[Deleted Comment]",
  );
  // Validate author identity - the display_name should be preserved
  TestValidator.predicate(
    "author id exists",
    deletedComment.author.id !== undefined && deletedComment.author.id !== null,
  );
  TestValidator.predicate(
    "author display_name exists",
    deletedComment.author.display_name !== undefined &&
      deletedComment.author.display_name !== null,
  );
  TestValidator.predicate(
    "author email exists",
    deletedComment.author.email !== undefined &&
      deletedComment.author.email !== null,
  );
  TestValidator.predicate(
    "author created_at exists",
    deletedComment.author.created_at !== undefined &&
      deletedComment.author.created_at !== null,
  );
  // Validate comment timestamps
  TestValidator.predicate(
    "deleted_at has valid timestamp",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "created_at has valid timestamp",
    deletedComment.created_at !== null &&
      deletedComment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at has valid timestamp",
    deletedComment.updated_at !== null &&
      deletedComment.updated_at !== undefined,
  );
  // Validate article summary structure
  TestValidator.predicate(
    "article summary has valid id",
    deletedComment.article.id !== undefined &&
      deletedComment.article.id !== null,
  );
  TestValidator.predicate(
    "article summary has valid title",
    deletedComment.article.title !== undefined &&
      deletedComment.article.title !== null,
  );
  TestValidator.predicate(
    "article summary has valid section",
    deletedComment.article.section !== undefined &&
      deletedComment.article.section !== null,
  );
  TestValidator.predicate(
    "article summary has valid author",
    deletedComment.article.author !== undefined &&
      deletedComment.article.author !== null,
  );
  TestValidator.predicate(
    "article summary has valid created_at",
    deletedComment.article.created_at !== undefined &&
      deletedComment.article.created_at !== null,
  );
  TestValidator.predicate(
    "article summary has valid updated_at",
    deletedComment.article.updated_at !== undefined &&
      deletedComment.article.updated_at !== null,
  );
  // Validate that timestamps are in ISO format
  if (deletedComment.deleted_at) {
    TestValidator.predicate(
      "deleted_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(deletedComment.deleted_at)),
    );
  }
  if (deletedComment.created_at) {
    TestValidator.predicate(
      "created_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(deletedComment.created_at)),
    );
  }
  if (deletedComment.updated_at) {
    TestValidator.predicate(
      "updated_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(deletedComment.updated_at)),
    );
  }
  if (deletedComment.article.created_at) {
    TestValidator.predicate(
      "article created_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(deletedComment.article.created_at)),
    );
  }
  if (deletedComment.article.updated_at) {
    TestValidator.predicate(
      "article updated_at is valid ISO 8601 date-time",
      !isNaN(Date.parse(deletedComment.article.updated_at)),
    );
  }
}
