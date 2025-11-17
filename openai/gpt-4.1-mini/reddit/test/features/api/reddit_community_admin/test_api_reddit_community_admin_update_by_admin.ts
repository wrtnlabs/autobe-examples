import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

export async function test_api_reddit_community_admin_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new admin via /auth/admin/join to obtain JWT tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://${RandomGenerator.alphaNumeric(8)}.com/page`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/referrer`,
  } satisfies IRedditCommunityAdmin.IJoin;

  const joinOutput: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(joinOutput);

  // 2. Create a new Reddit community admin account before updating it
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;
  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdAdmin);

  // 3. Update the created admin's email and password
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityAdmin.IUpdate;

  const updatedAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.update(
      connection,
      {
        id: createdAdmin.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAdmin);

  // 4. Verify updated admin details
  TestValidator.equals(
    "updated admin id matches created id",
    updatedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "updated admin email matches update request",
    updatedAdmin.email,
    updateBody.email,
  );
  TestValidator.predicate(
    "created_at is not changed",
    updatedAdmin.created_at === createdAdmin.created_at,
  );
  TestValidator.predicate(
    "updated_at is newer than or equal to created_at",
    new Date(updatedAdmin.updated_at).getTime() >=
      new Date(updatedAdmin.created_at).getTime(),
  );
}
