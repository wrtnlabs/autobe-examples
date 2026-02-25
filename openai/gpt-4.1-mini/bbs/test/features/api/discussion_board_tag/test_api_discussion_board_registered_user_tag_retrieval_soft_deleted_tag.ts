import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_tag_retrieval_soft_deleted_tag(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user signup and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123",
    },
  });
  typia.assert(userAuth);
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Prepare a tag that is soft deleted (deleted_at is non-null)
  // Since no tag create API is given, we rely on fetching a random existing tag with deleted_at set.
  // This test assumes there exists at least one soft deleted tag in data.
  // 3. We cannot list all tags since no list API exists; so we retry until found or fail.
  const MAX_RETRIES = 10;
  let deletedTagId: string | undefined = undefined;
  let deletedTag: IDiscussionBoardTag | null = null;
  for (let i = 0; i < MAX_RETRIES; i++) {
    // Random UUID to attempt fetch
    const randomTagId = typia.random<string & tags.Format<"uuid">>();
    try {
      const tag = await api.functional.discussionBoard.registeredUser.tags.at(
        userConnection,
        {
          tagId: randomTagId,
        },
      );
      typia.assert(tag);
      if (tag.deleted_at !== null) {
        deletedTagId = tag.id;
        deletedTag = tag;
        break;
      }
    } catch (exp) {
      // Ignore not found errors only
      if (
        exp instanceof Error &&
        ((exp as any).status === 404 || (exp as any).status === 400)
      ) {
        // Expected not found or bad request for random UUID
        continue;
      }
      throw exp;
    }
  }
  // 4. If no soft deleted tag found, skip the test
  if (deletedTagId === undefined) {
    // The scenario requires to fetch a soft deleted tag, but none found
    // So we output a warning or throw error
    throw new Error("No soft deleted tag found to test retrieval.");
  }
  // 5. Try fetching the soft deleted tag by ID explicitly
  const fetchedTag =
    await api.functional.discussionBoard.registeredUser.tags.at(
      userConnection,
      {
        tagId: deletedTagId,
      },
    );
  typia.assert(fetchedTag);
  // 6. Validate the retrieved tag matches and has deleted_at non-null
  TestValidator.equals(
    "soft deleted tag id matches",
    fetchedTag.id,
    deletedTagId,
  );
  TestValidator.predicate(
    "deleted_at is present",
    fetchedTag.deleted_at !== null,
  );
  // 7. Optional: Validate other properties exist and types
  TestValidator.predicate(
    "tag name exists",
    typeof fetchedTag.name === "string" && fetchedTag.name.length > 0,
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof fetchedTag.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof fetchedTag.updated_at === "string",
  );
  TestValidator.equals(
    "tag name consistent",
    fetchedTag.name,
    deletedTag!.name,
  );
}
