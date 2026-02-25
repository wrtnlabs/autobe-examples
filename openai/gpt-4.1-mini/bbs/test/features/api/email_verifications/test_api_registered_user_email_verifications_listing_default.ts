import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_email_verifications_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user join and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    },
  });
  typia.assert(authorized);
  // After join, userConnection.headers.Authorization should be set
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 2. Call listing endpoint with default filters (empty filter object)
  const listBody: IDiscussionBoardRegisteredUserEmailVerification.IRequest = {};
  const response =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: listBody },
    );
  // Assert response type
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Check all data items have valid structure
  // Also checking that expired_at, deleted_at are either string or null
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate(
      "valid uuid token id",
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "token string is not empty",
      typeof item.token === "string" && item.token.length > 0,
    );
    // expired_at and deleted_at can be null or valid date string
    if (item.expired_at !== null) {
      TestValidator.predicate(
        "expired_at is valid date",
        !Number.isNaN(Date.parse(item.expired_at)),
      );
    }
    if (item.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at is valid date",
        !Number.isNaN(Date.parse(item.deleted_at)),
      );
    }
  }
}
