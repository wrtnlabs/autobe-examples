import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
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

export async function test_api_registered_user_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup registered user and get authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234",
    },
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Retrieve an email verification.ID by random UUID (simulate environment)
  const emailVerificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the email verification record by ID
  const emailVerification =
    await api.functional.discussionBoard.registeredUser.emailVerifications.atEmailVerification(
      userConnection,
      { emailVerificationId },
    );
  typia.assert(emailVerification);
  // 4. Validate response fields
  TestValidator.predicate(
    "token is non-empty string",
    typeof emailVerification.token === "string" &&
      emailVerification.token.length > 0,
  );
  TestValidator.predicate(
    "registered_user_id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      emailVerification.registered_user_id,
    ),
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(emailVerification.expired_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(emailVerification.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(emailVerification.updated_at)),
  );
  // deleted_at can be null or valid ISO date string
  TestValidator.predicate(
    "deleted_at is null or valid date-time",
    emailVerification.deleted_at === null ||
      !isNaN(Date.parse(emailVerification.deleted_at!)),
  );
}
