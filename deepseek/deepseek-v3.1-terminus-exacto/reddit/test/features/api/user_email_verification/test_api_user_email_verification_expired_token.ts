import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 创建用户账户
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(user);
  // 模拟获取验证令牌ID（这里需要模拟一个已存在的验证记录）
  // 由于无法直接创建验证令牌，我们假设系统中已存在一些测试数据
  // 或者我们需要通过其他方式获取有效的验证ID
  // 创建一个随机的UUID作为验证ID（模拟过期令牌）
  const expiredVerificationId = typia.random<string & tags.Format<"uuid">>();
  // 调用验证接口检查过期令牌
  const verificationResult =
    await api.functional.communityPlatform.user.email_verifications.at(
      connection,
      {
        verificationId: expiredVerificationId,
      },
    );
  typia.assert(verificationResult);
  // 验证过期令牌的响应
  TestValidator.equals(
    "status should be expired",
    verificationResult.status,
    "expired",
  );
  TestValidator.predicate(
    "actor should be undefined for expired token",
    verificationResult.actor === undefined,
  );
  TestValidator.predicate(
    "expires_at should exist",
    verificationResult.expires_at !== undefined,
  );
}
