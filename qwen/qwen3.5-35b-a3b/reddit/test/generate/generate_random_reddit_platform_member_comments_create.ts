import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_platform_comment } from "../prepare/prepare_random_reddit_platform_comment";

/**
 * Generate a random comment on a post via the API for E2E testing.
 *
 * Prepares random comment data using the prepare function, then calls the creation endpoint to create a new comment on a Reddit-like platform post. ...
 */
export async function generate_random_reddit_platform_member_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformComment.ICreate> | undefined;
  },
): Promise<IRedditPlatformComment> {
  const prepared: IRedditPlatformComment.ICreate =
    prepare_random_reddit_platform_comment(props.body);
  const result: IRedditPlatformComment =
    await api.functional.redditPlatform.member.comments.create(connection, {
      body: prepared,
    });
  return result;
}
