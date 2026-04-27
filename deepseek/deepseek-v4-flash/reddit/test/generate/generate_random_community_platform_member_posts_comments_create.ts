import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment } from "../prepare/prepare_random_community_platform_comment";

/**
 * Generate a random comment on an existing post via the API for E2E testing.
 *
 * Prepares random comment data using the prepare function, then calls the
 * comment creation endpoint to create the resource. The postId URL parameter
 * identifies which post the comment belongs to, and an optional commentId in
 * the body can create threaded replies.
 *
 * @param connection The API connection object
 * @param props.body Partial input to override randomly generated comment data
 * @param props.params.postId UUID of the post to create the comment on
 * @returns The newly created comment with all system-generated fields
 */
export async function generate_random_community_platform_member_posts_comments_create(
    connection: api.IConnection,
    props: {
      body?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined;
      params: {
        postId: string;
      };
    }
): Promise<ICommunityPlatformComment> {
    const prepared: ICommunityPlatformComment.ICreate = prepare_random_community_platform_comment(
        props.body
    );
    return await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
            body: prepared,
            postId: props.params.postId,
        },
    );
}