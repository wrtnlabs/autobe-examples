import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModerator";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_community_moderators_listing(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join)
  const adminJoinBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;
  // Unfortunately, admin join needs a user_id that refers to existing user.
  // So we need to first register an user, then create admin with that user_id.

  // 2. Register a normal user (join)
  const userJoinBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "AdminPass123!",
    href: "https://test.local/admin",
    referrer: "https://test.local",
  } satisfies IRedditCommunityUser.ICreate;
  const user = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(user);

  // Now create admin with the user's id as user_id
  const adminJoinBodyFinal = {
    user_id: user.id,
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBodyFinal,
  });
  typia.assert(admin);

  // 3. Login as admin
  const adminLoginBody = {
    email: userJoinBody.email,
    password: userJoinBody.password,
    href: "https://test.local/admin/login",
    referrer: "https://test.local",
  } satisfies IRedditCommunityAdmin.ILogin;
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });
  typia.assert(adminLogin);

  // Use this token inside current connection - SDK handles it automatically

  // 4. Register a 'user' account separately
  const userEmail = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const userPassword = "UserPass123!";
  const userJoinBody2 = {
    email: userEmail,
    password: userPassword,
    href: "https://test.local/user",
    referrer: "https://test.local",
  } satisfies IRedditCommunityUser.ICreate;
  const user2 = await api.functional.auth.user.join(connection, {
    body: userJoinBody2,
  });
  typia.assert(user2);

  // 5. Login as user
  const userLoginBody = {
    email: userEmail,
    password: userPassword,
    href: "https://test.local/user/login",
    referrer: "https://test.local",
  } satisfies IRedditCommunityUser.ILogin;
  const userLogin = await api.functional.auth.user.login(connection, {
    body: userLoginBody,
  });
  typia.assert(userLogin);

  // 6. Create a community with a unique name
  const communityName = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    name: communityName,
    description: "Test community description",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 7. Switch back to admin login for moderator listing
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // 8. Call moderator listing patch endpoint with pagination parameters
  const moderatorRequestBody = {
    community_name: communityName,
    page: 1,
    limit: 10,
    sort_by: "assigned_at",
    order: "desc",
  } satisfies IRedditCommunityCommunityModerator.IRequest;

  const moderatorList =
    await api.functional.redditCommunity.user.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: moderatorRequestBody,
      },
    );
  typia.assert(moderatorList);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    typeof moderatorList.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page is 1",
    moderatorList.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    moderatorList.pagination.limit === 10,
  );
  TestValidator.predicate("data is array", Array.isArray(moderatorList.data));

  // Validate each moderator summary has required fields
  for (const mod of moderatorList.data) {
    typia.assert(mod);
    TestValidator.predicate("moderator has id", typeof mod.id === "string");
    TestValidator.predicate(
      "moderator has user_email",
      typeof mod.user_email === "string",
    );
    TestValidator.predicate(
      "moderator has user_created_at",
      typeof mod.user_created_at === "string",
    );
    TestValidator.predicate(
      "moderator has created_at",
      typeof mod.created_at === "string",
    );
  }

  // 9. Validate unauthorized access error when using user login
  await api.functional.auth.user.login(connection, { body: userLoginBody });

  await TestValidator.error("access denied for non-admin user", async () => {
    await api.functional.redditCommunity.user.communities.moderators.index(
      connection,
      {
        communityName: communityName,
        body: moderatorRequestBody,
      },
    );
  });
}
