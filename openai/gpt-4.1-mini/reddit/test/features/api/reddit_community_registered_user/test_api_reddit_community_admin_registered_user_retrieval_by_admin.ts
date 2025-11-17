import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_admin_registered_user_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates with valid unique email and password
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IRedditCommunityAdmin.IJoin;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  // 2. Retrieve a registered Reddit Community user by ID
  const userId = typia.random<string & tags.Format<"uuid">>();
  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.admin.redditCommunityRegisteredusers.at(
      connection,
      { id: userId },
    );
  typia.assert(registeredUser);

  // Validation of response basic properties
  TestValidator.predicate(
    "User ID should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredUser.id,
    ),
  );
  TestValidator.predicate(
    "User email should be a valid email format",
    /^[\w.!#$%&'*+/=?^_`{|}~-]+@[\w-]+(?:\.[\w-]+)+$/.test(
      registeredUser.email,
    ),
  );
  TestValidator.predicate(
    "User created_at should be a valid date-time string",
    !isNaN(Date.parse(registeredUser.created_at)),
  );
  TestValidator.predicate(
    "User updated_at should be a valid date-time string",
    !isNaN(Date.parse(registeredUser.updated_at)),
  );
  TestValidator.predicate(
    "User deleted_at should be either null/undefined or a valid date-time string",
    registeredUser.deleted_at === null ||
      registeredUser.deleted_at === undefined ||
      !isNaN(Date.parse(registeredUser.deleted_at ?? "")),
  );
}
