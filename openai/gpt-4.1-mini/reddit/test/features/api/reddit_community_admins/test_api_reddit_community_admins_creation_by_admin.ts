import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

export async function test_api_reddit_community_admins_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Initial admin signup to obtain valid authorization and tokens
  const initialAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const initialAdminPassword = RandomGenerator.alphaNumeric(12);

  const initialAdmin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: initialAdminEmail,
        password: initialAdminPassword,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(initialAdmin);

  // Step 2: Create a second Reddit community admin using the authorized connection
  const newAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const newAdminPassword = RandomGenerator.alphaNumeric(12);

  const createdAdmin: IRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
      connection,
      {
        body: {
          email: newAdminEmail,
          password: newAdminPassword,
        } satisfies IRedditCommunityAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);

  // Step 3: Validations using TestValidator
  TestValidator.predicate(
    "created admin id is a non-empty string",
    createdAdmin.id.length > 0,
  );
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    newAdminEmail,
  );
  TestValidator.predicate(
    "created admin created_at is a non-empty string",
    createdAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "created admin updated_at is a non-empty string",
    createdAdmin.updated_at.length > 0,
  );
}
