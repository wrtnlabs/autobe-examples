import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { prepare_random_reddit_like_community_profile_image } from "../../../prepare/prepare_random_reddit_like_community_profile_image";
import { prepare_random_reddit_like_community_profile } from "../../../prepare/prepare_random_reddit_like_community_profile";
import { generate_random_reddit_like_community_member_profiles_images_create } from "../../../generate/generate_random_reddit_like_community_member_profiles_images_create";
import { generate_random_reddit_like_community_member_profile_create } from "../../../generate/generate_random_reddit_like_community_member_profile_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test retrieving complete metadata for an active profile avatar image.
 *
 * Authenticates as a member and creates their profile. Uploads an avatar image
 * to the profile. Calls the endpoint with profileId and imageId from the uploaded
 * image. Verifies the response contains complete image metadata: id matches the
 * uploaded imageId, file_key is a valid storage reference string, content_type
 * is a valid image MIME type (image/jpeg, image/png, or image/webp),
 * file_size is a positive integer, width and height are positive integers,
 * is_active is true (since this is the current/only active avatar), created_at and
 * updated_at are valid ISO 8601 datetime strings, and profile nested object
 * contains the parent profile summary with correct id. Special attention is given
 * to verifying that the is_active flag correctly reflects the image as the
 * currently displayed avatar, and that ownership is correctly established
 * (profile.id matches profileId parameter).
 */
export async function test_api_profile_image_retrieve_active_metadata(connection: api.IConnection): Promise<void> {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            email: `member_${RandomGenerator.alphabets(8)}@test.com`,
            password: "1234",
            username: RandomGenerator.alphabets(8),
            href: "https://example.com",
            referrer: "https://example.com",
        } satisfies IREdditLikeCommunityMember.IJoin,
    });

    const profile = await generate_random_reddit_like_community_member_profile_create(memberConnection);
    const image = await generate_random_reddit_like_community_member_profiles_images_create(memberConnection, {
        params: { profileId: profile.id },
    });

    const retrieved = await api.functional.redditLikeCommunity.profiles.images.at(memberConnection, {
        profileId: profile.id,
        imageId: image.id,
    });
    typia.assert(retrieved);

    TestValidator.equals("image id matches", retrieved.id, image.id);
    TestValidator.predicate("file_key is valid string", typeof retrieved.file_key === "string" && retrieved.file_key.length > 0);
    TestValidator.predicate("content_type is valid image MIME", retrieved.content_type.startsWith("image/"));
    TestValidator.predicate("file_size is positive", retrieved.file_size > 0);
    TestValidator.predicate("width is positive", retrieved.width > 0);
    TestValidator.predicate("height is positive", retrieved.height > 0);
    TestValidator.equals("is_active is true", retrieved.is_active, true);
    TestValidator.predicate("created_at is valid ISO datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/i.test(retrieved.created_at));
    TestValidator.predicate("updated_at is valid ISO datetime", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/i.test(retrieved.updated_at));
    TestValidator.equals("profile id matches", retrieved.profile.id, profile.id);
}