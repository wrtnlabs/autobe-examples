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

export async function test_api_community_erase_nonexistent_community_unavailable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  let firstThrew = false;
  try {
    await api.functional.communityPlatform.communities.erase(memberConnection, {
      communityId: nonexistentCommunityId,
    });
  } catch {
    firstThrew = true;
  }
  let secondThrew = false;
  try {
    await api.functional.communityPlatform.communities.erase(memberConnection, {
      communityId: nonexistentCommunityId,
    });
  } catch {
    secondThrew = true;
  }
  TestValidator.equals(
    "delete nonexistent community should be idempotent (no phantom created)",
    secondThrew,
    firstThrew,
  );
}
