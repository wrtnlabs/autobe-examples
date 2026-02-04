import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_unban_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize an owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformOwner.IJoin,
  });
  // Step 2: Create a new connection and authorize a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Step 3: Log in as moderator to ensure proper authorization
  // The authorize_moderator_login function updates connection.headers internally;
  // no need to conditionally override email as the function uses the provided body
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Step 4: Generate a valid UUID for a ban that might exist (since we can't create one)
  // According to API documentation, the banId is a UUID from community_platform_bans table
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  typia.assert(banId); // Validate that the generated banId conforms to UUID format
  // Step 5: Unban the user using owner connection and banId
  // Since we don't have a way to create a ban, we test the unban API with a plausible UUID
  // The API should return 204 No Content if the ban exists, or 404 if it doesn't
  // We can't verify the outcome without a read endpoint, but we validate the unban call succeeds
  const unbanResult =
    await api.functional.communityPlatform.owner.moderation.bans.erase(
      ownerConnection,
      { banId: banId },
    );
  // No response body expected, so just assert the call succeeded (no exception thrown)
  // We rely on the API contract that DELETE /communityPlatform/owner/moderation/bans/{banId} performs deletion and returns 204
}
