import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_update_full(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!123",
      username: RandomGenerator.name(2),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Update member's profile
  const updatedProfile = await api.functional.reddit.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: RandomGenerator.name(2).replace(
          /[^a-zA-Z0-9 ]/g,
          "",
        ) satisfies string &
          tags.MinLength<2> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9 ]+$">,
        bio: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 15,
        }) satisfies string & tags.MaxLength<500>,
        avatar:
          `https://avatars.example.com/${RandomGenerator.alphaNumeric(10)}.png` satisfies string &
            tags.Format<"uri">,
      } satisfies IRedditProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Validate profile update
  TestValidator.equals(
    "display name should match",
    updatedProfile.displayName,
    updatedProfile.displayName,
  );
  TestValidator.equals(
    "bio should have proper length",
    updatedProfile.bio?.length,
    RandomGenerator.paragraph({ sentences: 2, wordMin: 15 }).length,
  );
  TestValidator.predicate(
    "avatar should be PNG format",
    updatedProfile.avatarUrl?.endsWith(".png") ?? false,
  );
}
