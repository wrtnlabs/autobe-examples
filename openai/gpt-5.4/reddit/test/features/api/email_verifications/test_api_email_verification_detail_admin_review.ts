import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_email_verification_detail_admin_review(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const emailVerificationId = typia.random<string & tags.Format<"uuid">>();
  const first =
    await api.functional.communityPlatform.admin.email_verifications.at(
      adminConnection,
      {
        emailVerificationId,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.communityPlatform.admin.email_verifications.at(
      adminConnection,
      {
        emailVerificationId,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "email verification detail is unchanged across repeated admin inspection",
    second,
    first,
  );
}
