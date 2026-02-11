import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_with_valid_data(
  connection: api.IConnection,
) {
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
    } satisfies ICommunityMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = authConnection.headers;
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });
  const avatarUrl = `https://example.com/avatar_${RandomGenerator.alphaNumeric(8)}`;
  const updatedProfile = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: displayName satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        bio: bio satisfies string & tags.MaxLength<500>,
        avatar_url: avatarUrl satisfies string & tags.Format<"uri">,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display name matches",
    updatedProfile.display_name,
    displayName,
  );
  TestValidator.equals("bio matches", updatedProfile.bio, bio);
  TestValidator.equals(
    "avatar URL matches",
    updatedProfile.avatar_url,
    avatarUrl,
  );
}
