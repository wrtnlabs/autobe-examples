import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_own_public_details(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const originalProfile = authorized.profile;
  typia.assert(originalProfile);
  const avatarExtension = RandomGenerator.pick(["png", "jpg", "webp"] as const);
  const avatarMimeType =
    {
      png: "image/png",
      jpg: "image/jpeg",
      webp: "image/webp",
    }[avatarExtension] ?? "application/octet-stream";
  const avatarOriginalName = `avatar-${RandomGenerator.alphabets(8)}.${avatarExtension}`;
  const avatarUrl = `https://example.com/profiles/${RandomGenerator.alphaNumeric(16)}.${avatarExtension}`;
  const avatarSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const updatedDisplayName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const updatedBio = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const body = {
    display_name: updatedDisplayName,
    bio: updatedBio,
    avatar: {
      category: "avatar",
      original_name: avatarOriginalName,
      extension: avatarExtension,
      mime_type: avatarMimeType,
      size: avatarSize,
      url: avatarUrl,
    },
  } satisfies ICommunityPlatformProfile.IUpdate;
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "profile id preserved",
    updatedProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.equals("bio updated", updatedProfile.bio, updatedBio);
  TestValidator.equals(
    "karma preserved",
    updatedProfile.karma,
    originalProfile.karma,
  );
  TestValidator.equals(
    "posts preserved",
    updatedProfile.posts,
    originalProfile.posts,
  );
  TestValidator.equals(
    "comments preserved",
    updatedProfile.comments,
    originalProfile.comments,
  );
  TestValidator.predicate(
    "avatar metadata reflected in files",
    ArrayUtil.has(
      updatedProfile.files,
      (file) =>
        file.category === "avatar" &&
        file.original_name === avatarOriginalName &&
        file.extension === avatarExtension &&
        file.mime_type === avatarMimeType &&
        file.size === avatarSize &&
        file.url === avatarUrl,
    ),
  );
}
