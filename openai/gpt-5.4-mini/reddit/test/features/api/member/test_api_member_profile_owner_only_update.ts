import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_owner_only_update(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    username: `owner_${RandomGenerator.alphabets(8)}`,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
  } satisfies ICommunityPlatformMember.IJoin;
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: ownerJoinBody,
  });
  typia.assert(ownerAuthorized);
  const otherConnection: api.IConnection = { host: connection.host };
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    username: `other_${RandomGenerator.alphabets(8)}`,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
  } satisfies ICommunityPlatformMember.IJoin;
  const otherAuthorized = await authorize_member_join(otherConnection, {
    body: otherJoinBody,
  });
  typia.assert(otherAuthorized);
  const originalOtherProfile: ICommunityPlatformMember = {
    id: otherAuthorized.id,
    email: otherAuthorized.email,
    username: otherAuthorized.username,
    displayName: otherAuthorized.displayName,
    bio: otherAuthorized.bio,
    avatarImageUri: otherAuthorized.avatarImageUri,
    karma: otherAuthorized.karma,
    createdAt: otherAuthorized.createdAt,
    updatedAt: otherAuthorized.updatedAt,
    deletedAt: otherAuthorized.deletedAt,
  };
  const updateBody = {
    displayName: `${ownerAuthorized.displayName} Updated`,
    bio: "Updated owner bio",
    avatarImageUri: `https://example.com/${RandomGenerator.alphabets(10)}.jpg`,
  } satisfies ICommunityPlatformMember.IUpdate;
  const updatedOwner =
    await api.functional.communityPlatform.member.profile.update(
      ownerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedOwner);
  TestValidator.equals(
    "updated profile id should match owner",
    updatedOwner.id,
    ownerAuthorized.id,
  );
  TestValidator.equals(
    "updated profile email should match owner",
    updatedOwner.email,
    ownerAuthorized.email,
  );
  TestValidator.equals(
    "updated profile username should match owner",
    updatedOwner.username,
    ownerAuthorized.username,
  );
  TestValidator.equals(
    "updated profile displayName should reflect update",
    updatedOwner.displayName,
    updateBody.displayName,
  );
  TestValidator.equals(
    "updated profile bio should reflect update",
    updatedOwner.bio,
    updateBody.bio,
  );
  TestValidator.equals(
    "updated profile avatar should reflect update",
    updatedOwner.avatarImageUri,
    updateBody.avatarImageUri,
  );
  TestValidator.equals(
    "other member id should remain unchanged",
    otherAuthorized.id,
    originalOtherProfile.id,
  );
  TestValidator.equals(
    "other member email should remain unchanged",
    otherAuthorized.email,
    originalOtherProfile.email,
  );
  TestValidator.equals(
    "other member username should remain unchanged",
    otherAuthorized.username,
    originalOtherProfile.username,
  );
  TestValidator.equals(
    "other member displayName should remain unchanged",
    otherAuthorized.displayName,
    originalOtherProfile.displayName,
  );
  TestValidator.equals(
    "other member bio should remain unchanged",
    otherAuthorized.bio,
    originalOtherProfile.bio,
  );
  TestValidator.equals(
    "other member avatar should remain unchanged",
    otherAuthorized.avatarImageUri,
    originalOtherProfile.avatarImageUri,
  );
}
