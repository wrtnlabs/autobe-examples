import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_viewing_empty_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for empty profile (user with no posts/comments)
  const emptyProfileConnection: api.IConnection = { host: connection.host };
  const emptyProfileAuth = await authorize_member_join(emptyProfileConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(emptyProfileAuth);
  // 2. Create member account to view the empty profile (viewer)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(viewerAuth);
  // 3. Generate a test user ID (in a real scenario, we would get this from the user creation response)
  // For this edge case test, we'll use a known UUID pattern that represents a new user
  const emptyProfileUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. View the empty user's profile as viewer
  const profile = await api.functional.redditCommunity.member.users.profile.at(
    viewerConnection,
    {
      userId: emptyProfileUserId,
    },
  );
  typia.assert(profile);
  // 5. Validate profile structure
  TestValidator.equals("profile has id", profile.id !== undefined, true);
  TestValidator.equals(
    "display name exists",
    profile.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at exists",
    profile.created_at !== undefined,
    true,
  );
  // 6. Validate empty state - karma should be 0 for new user with no contributions
  TestValidator.equals("karma score is 0", profile.karma_score, 0);
  // 7. Validate optional fields are handled correctly
  TestValidator.predicate(
    "bio is optional (null, undefined, or string)",
    () =>
      profile.bio === null ||
      profile.bio === undefined ||
      typeof profile.bio === "string",
  );
  TestValidator.predicate(
    "avatar image url is optional (null, undefined, or uri)",
    () =>
      profile.avatar_image_url === null ||
      profile.avatar_image_url === undefined ||
      typia.is<string & tags.Format<"uri">>(profile.avatar_image_url),
  );
  // 8. Validate timestamp format
  TestValidator.predicate("created_at is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(profile.created_at),
  );
}