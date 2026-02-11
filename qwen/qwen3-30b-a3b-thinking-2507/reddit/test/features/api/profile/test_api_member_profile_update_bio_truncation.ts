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

export async function test_api_member_profile_update_bio_truncation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  const longBio = "a".repeat(600);
  const updatedProfile = await api.functional.community.member.profile.update(
    memberConnection,
    {
      body: {
        bio: longBio,
      } satisfies ICommunityMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  TestValidator.equals("bio truncated to 500", updatedProfile.bio?.length, 500);
}
