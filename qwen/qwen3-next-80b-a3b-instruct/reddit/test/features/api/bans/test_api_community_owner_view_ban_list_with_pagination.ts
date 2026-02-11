import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_view_ban_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for communityId
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create a request body with pagination parameters for second page, limit=5
  // The endpoint supports filtering by community_id, but we've already provided it in path
  const request: IRedditCommunityBanOfMember.IRequest = {
    deleted_at: null, // Only active bans
  };
  // Call the bans.index endpoint
  const bansPage =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      connection,
      {
        communityId,
        body: request,
      },
    );
  typia.assert(bansPage);
  // Validate the response structure conforms to IPageIRedditCommunityBanOfMember.ISummary
  TestValidator.equals(
    "pagination current page",
    bansPage.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", bansPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records >= 0",
    bansPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    bansPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "bans data array exists",
    Array.isArray(bansPage.data),
  );
  // Validate each ban entry structure
  for (const ban of bansPage.data) {
    // ID must be UUID
    TestValidator.equals("ban has id", typeof ban.id, "string");
    TestValidator.predicate(
      "ban id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.id,
      ),
    );
    // Reason must be string
    TestValidator.equals("ban has reason", typeof ban.reason, "string");
    // Created at must be ISO date-time
    TestValidator.equals("ban has created_at", typeof ban.created_at, "string");
    TestValidator.predicate(
      "created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
        ban.created_at,
      ),
    );
    // Moderator summary
    TestValidator.equals("moderator has id", typeof ban.moderator.id, "string");
    TestValidator.predicate(
      "moderator id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.moderator.id,
      ),
    );
    TestValidator.equals(
      "moderator has display_name",
      typeof ban.moderator.display_name,
      "string",
    );
    TestValidator.predicate(
      "moderator display_name is not empty",
      ban.moderator.display_name.length > 0,
    );
    TestValidator.equals(
      "moderator has created_at",
      typeof ban.moderator.created_at,
      "string",
    );
    TestValidator.predicate(
      "moderator created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
        ban.moderator.created_at,
      ),
    );
    // Community summary
    TestValidator.equals("community has id", typeof ban.community.id, "string");
    TestValidator.predicate(
      "community id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.community.id,
      ),
    );
    TestValidator.equals(
      "community has name",
      typeof ban.community.name,
      "string",
    );
    TestValidator.predicate(
      "community name is not empty",
      ban.community.name.length > 0,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof ban.community.subscriber_count,
      "number",
    );
    TestValidator.predicate(
      "subscriber_count >= 0",
      ban.community.subscriber_count >= 0,
    );
    // Banned actor summary (one of three types)
    TestValidator.equals(
      "banned_actor has id",
      typeof ban.banned_actor.id,
      "string",
    );
    TestValidator.predicate(
      "banned_actor id is valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ban.banned_actor.id,
      ),
    );
    TestValidator.equals(
      "banned_actor has display_name",
      typeof ban.banned_actor.display_name,
      "string",
    );
    TestValidator.predicate(
      "banned_actor display_name is not empty",
      ban.banned_actor.display_name.length > 0,
    );
    // Verify banned_actor is one of the three allowed types by checking available properties
    if ("bio" in ban.banned_actor) {
      TestValidator.predicate(
        "banned_actor bio is string or null or undefined",
        ban.banned_actor.bio === null ||
          ban.banned_actor.bio === undefined ||
          typeof ban.banned_actor.bio === "string",
      );
    }
    if ("avatar_url" in ban.banned_actor) {
      TestValidator.predicate(
        "banned_actor avatar_url is string or null or undefined",
        ban.banned_actor.avatar_url === null ||
          ban.banned_actor.avatar_url === undefined ||
          typeof ban.banned_actor.avatar_url === "string",
      );
    }
  }
}
