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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
export async function test_api_owner_ban_list_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as owner to access moderation bans
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(owner);
  // Step 2: Call the bans.index function with a community_id to test filtering
  // Since we cannot create test data via available functions, we rely on existing data or use a reasonable community_id
  // Use a valid UUID format for community_id that may exist in the system
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.communityPlatform.owner.moderation.bans.index(
      ownerConnection,
      {
        body: {
          community_id: communityId,
        },
      },
    );
  typia.assert(response);
  // Validate response structure according to IPageICommunityPlatformBan
  TestValidator.equals(
    "response contains pagination",
    response.pagination !== null,
    true,
  );
  TestValidator.equals(
    "response contains data array",
    Array.isArray(response.data),
    true,
  );
  // Verify that the response conforms to the schema
  // Since we cannot create test data to verify filtering, we validate the structure only
  if (response.data.length > 0) {
    // If data exists, verify at least one ban has the expected structure
    const firstBan = response.data[0];
    TestValidator.equals(
      "ban has id property",
      typeof firstBan.id === "string",
      true,
    );
    TestValidator.equals(
      "ban has community_id property",
      typeof firstBan.community_id === "string",
      true,
    );
    TestValidator.equals(
      "ban has banned_user_id property",
      typeof firstBan.banned_user_id === "string",
      true,
    );
    TestValidator.equals(
      "ban has moderator_id property",
      typeof firstBan.moderator_id === "string",
      true,
    );
    TestValidator.equals(
      "ban has created_at property",
      typeof firstBan.created_at === "string",
      true,
    );
    TestValidator.equals(
      "ban has reason property",
      firstBan.reason === null || typeof firstBan.reason === "string",
      true,
    );
    TestValidator.equals(
      "ban has bannedUser property",
      typeof firstBan.bannedUser === "object" && firstBan.bannedUser !== null,
      true,
    );
    TestValidator.equals(
      "ban has community property",
      typeof firstBan.community === "object" && firstBan.community !== null,
      true,
    );
    TestValidator.equals(
      "ban has moderator property",
      typeof firstBan.moderator === "object" && firstBan.moderator !== null,
      true,
    );
  }
}
