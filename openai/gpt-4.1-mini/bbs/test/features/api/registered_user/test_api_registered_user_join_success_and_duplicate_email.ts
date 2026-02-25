import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_join_success_and_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Generate a unique email and a password
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: uniqueEmail,
    password,
  } satisfies IDiscussionBoardRegisteredUser.IJoin;
  // Scenario 1: Successful registration
  const authorizedUser = await authorize_registered_user_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(authorizedUser);
  // Validate user profile fields
  TestValidator.predicate(
    "user id exists",
    typeof authorizedUser.id === "string" && authorizedUser.id.length > 0,
  );
  TestValidator.equals("email matches", authorizedUser.email, uniqueEmail);
  TestValidator.predicate(
    "displayName is non-empty string",
    typeof authorizedUser.displayName === "string" &&
      authorizedUser.displayName.length > 0,
  );
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "user is not banned",
    authorizedUser.isBanned === false,
  );
  TestValidator.predicate(
    "createdAt is ISO datetime",
    typeof authorizedUser.createdAt === "string" &&
      authorizedUser.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is ISO datetime",
    typeof authorizedUser.updatedAt === "string" &&
      authorizedUser.updatedAt.length > 0,
  );
  // Validate deletedAt is null
  TestValidator.equals("deletedAt is null", authorizedUser.deletedAt, null);
  // Scenario 2: Attempt duplicate registration with same email
  const dupConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email registration fails", async () => {
    await authorize_registered_user_join(dupConnection, {
      body: { email: uniqueEmail, password: RandomGenerator.alphaNumeric(16) },
    });
  });
}
