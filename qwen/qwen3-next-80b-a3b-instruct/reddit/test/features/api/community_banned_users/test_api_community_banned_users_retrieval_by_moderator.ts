import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_banned_users_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator (using utility function with isolation pattern)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {} satisfies ICommunityModerator.IJoin,
    },
  );
  typia.assert(authorizedModerator);
  // 2. Since we cannot create a community or ban users with the provided API functions,
  //    we need to use the only available pathway: retrieve banned users for a community
  //    that must already exist in the test environment. The scenario is impossible to fully
  //    test with the given API functions, so we'll test the structure of the response
  //    assuming a community with banned users exists.
  // 3. Retrieve banned users using the functional API (since no utility function exists)
  //    and use a dummy communityId as per implementation necessity
  const communityId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"; // Dummy UUID as required by schema
  // 4. Invoke the endpoint to retrieve banned users
  const bannedUsers =
    await api.functional.community.moderator.communities.banned_users.index(
      moderatorConnection,
      {
        communityId,
        body: {} satisfies ICommunityBannedUser.IRequest,
      },
    );
  typia.assert(bannedUsers);
  // 5. Validate response structure according to IPageICommunityBannedUser
  TestValidator.equals(
    "pagination exists",
    bannedUsers.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", Array.isArray(bannedUsers.data), true);
  // Validate pagination structure according to IPage.IPagination
  const { current, limit, records, pages } = bannedUsers.pagination;
  TestValidator.predicate("current is integer", Number.isInteger(current));
  TestValidator.predicate("limit is integer", Number.isInteger(limit));
  TestValidator.predicate("records is integer", Number.isInteger(records));
  TestValidator.predicate("pages is integer", Number.isInteger(pages));
  TestValidator.predicate("limit > 0", limit > 0);
  TestValidator.predicate("records >= 0", records >= 0);
  TestValidator.predicate("pages >= 0", pages >= 0);
  // Validate data array structure
  bannedUsers.data.forEach((user) => {
    TestValidator.equals("user has id", typeof user.id, "string");
    TestValidator.predicate(
      "user id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.id,
      ),
    );
    TestValidator.equals(
      "user has community_id",
      typeof user.community_id,
      "string",
    );
    TestValidator.predicate(
      "community_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.community_id,
      ),
    );
    TestValidator.equals(
      "user has banned_user_id",
      typeof user.banned_user_id,
      "string",
    );
    TestValidator.predicate(
      "banned_user_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.banned_user_id,
      ),
    );
    TestValidator.equals(
      "user has banned_by_id",
      typeof user.banned_by_id,
      "string",
    );
    TestValidator.predicate(
      "banned_by_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        user.banned_by_id,
      ),
    );
    TestValidator.equals("user has reason", typeof user.reason, "string");
    TestValidator.predicate("reason length >= 10", user.reason.length >= 10);
    TestValidator.predicate("reason length <= 500", user.reason.length <= 500);
    TestValidator.equals(
      "user has created_at",
      typeof user.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.created_at),
    );
    TestValidator.equals(
      "user has updated_at",
      typeof user.updated_at,
      "string",
    );
    TestValidator.predicate(
      "updated_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.updated_at),
    );
    TestValidator.equals(
      "user has deleted_at",
      user.deleted_at === null ||
        user.deleted_at === undefined ||
        typeof user.deleted_at === "string",
      true,
    );
    if (user.deleted_at !== null && user.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at is ISO date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(user.deleted_at),
      );
    }
  });
}
