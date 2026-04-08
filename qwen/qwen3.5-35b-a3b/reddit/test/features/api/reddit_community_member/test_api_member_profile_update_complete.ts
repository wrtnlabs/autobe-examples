import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joinResponse.token.access}` },
  };
  // 3. Prepare profile update data - only display_name is validated in response
  // Note: bio and avatar are profile fields but not part of IRedditCommunityMember response
  const display_name = RandomGenerator.name(2);
  // 4. Update profile
  const updatedMember =
    await api.functional.redditCommunity.member.profile.update(
      memberConnection,
      {
        body: {
          display_name,
        } satisfies IRedditCommunityMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 5. Validate response - display_name maps to username in the member entity
  TestValidator.equals(
    "display_name matches input (mapped to username)",
    updatedMember.username,
    display_name,
  );
  // 6. Validate timestamps - updated_at should differ from created_at
  TestValidator.notEquals(
    "updated_at differs from created_at",
    updatedMember.created_at,
    updatedMember.updated_at,
  );
  // 7. Validate member has all required fields
  TestValidator.equals(
    "member id is valid UUID",
    updatedMember.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "member email unchanged",
    updatedMember.email,
    joinResponse.email,
  );
}
