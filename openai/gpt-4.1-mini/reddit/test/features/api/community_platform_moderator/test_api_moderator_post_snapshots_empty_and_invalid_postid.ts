import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_post_snapshots_empty_and_invalid_postid(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join and obtain moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty object
  });
  // 1. Use a random UUID postId that likely does not exist to test empty snapshots list return
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const outputEmptySnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.indexSnapshots(
      moderatorConnection,
      {
        postId: nonExistentPostId,
      },
    );
  typia.assert(outputEmptySnapshots);
  // Validate the data array is empty and pagination properties structure
  TestValidator.equals(
    "empty snapshots data should be empty",
    outputEmptySnapshots.data.length,
    0,
  );
  // Pagination properties must be present and consistent with empty result
  const { pagination } = outputEmptySnapshots;
  typia.assert(pagination);
  TestValidator.predicate(
    "pagination current page is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 0", pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", pagination.pages >= 0);
  // 2. Test with invalid postId that is not UUID format to verify parameter validation and rejection
  // Example invalid postId - random alphanumeric string without UUID format
  const invalidPostId = RandomGenerator.alphaNumeric(20);
  await TestValidator.error(
    "invalid postId format should throw error",
    async () => {
      await api.functional.communityPlatform.moderator.posts.snapshots.indexSnapshots(
        moderatorConnection,
        {
          postId: invalidPostId,
        },
      );
    },
  );
}
