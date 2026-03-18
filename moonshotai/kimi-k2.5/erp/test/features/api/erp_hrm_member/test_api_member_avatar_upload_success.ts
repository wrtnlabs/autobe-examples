import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_avatar_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Prepare valid avatar URI
  const avatarUrl = typia.random<string & tags.Format<"uri">>();
  const body = {
    avatarUrl: avatarUrl,
  } satisfies IErpHrmMember.IAvatarUpload;
  // 3. Upload avatar
  const response =
    await api.functional.erpHrm.member.profile.avatar.updateAvatar(
      memberConnection,
      { body },
    );
  typia.assert(response);
  // 4. Verify avatarUrl matches submitted value
  TestValidator.equals(
    "avatarUrl matches submitted URI",
    response.avatarUrl,
    avatarUrl,
  );
}
