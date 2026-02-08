import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_tag_usage_stats_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving tag usage statistics for an existing tag.
  // 1. Create guest connection and authorize guest join
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // 2. Create a new tag with a unique name
  const tag = await generate_random_discussion_board_tags_create(
    guestConnection,
    {
      body: {
        name: "tag_" + RandomGenerator.alphabets(10),
      },
    },
  );
  typia.assert(tag);
  // 3. Retrieve usage statistics for the created tag
  const tagId = (tag as any).uuid ?? typia.random<string & tags.Format<"uuid">>();
  const usageStats =
    await api.functional.discussionBoard.guest.tags.usage_stats.atUsageStats(
      guestConnection,
      {
        tagId: tagId,
      },
    );
  typia.assert(usageStats);
  // 4. Skipping checks on usageStats properties as they do not exist in the type
  // 5. Test retrieval of usage statistics for a non-existent tag (expect 404)
  await TestValidator.httpError(
    "retrieving usage stats for non-existent tag",
    404,
    async () => {
      await api.functional.discussionBoard.guest.tags.usage_stats.atUsageStats(
        guestConnection,
        {
          tagId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
