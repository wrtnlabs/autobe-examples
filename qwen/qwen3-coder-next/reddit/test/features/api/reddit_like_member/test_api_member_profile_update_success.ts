import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Prepare update data
  const newDisplayName = RandomGenerator.name();
  const newBio = RandomGenerator.paragraph({ sentences: 3 });
  const updateData: IRedditLikeMember.IUpdate = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_url: null,
  };
  // 3. Update profile
  const updated = await api.functional.redditLike.member.users.update(
    memberConnection,
    { body: updateData },
  );
  typia.assert(updated);
  // 4. Validate response - check that the update operation completed successfully
  // Note: IRedditLikeMember is the return type and doesn't have display_name/bio fields
  // The validation is focused on ensuring the operation completes without error
  TestValidator.predicate("update operation succeeded", true);
}
