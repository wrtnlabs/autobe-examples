import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_invitations_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. 管理员认证
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. 创建测试社区ID
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. 测试pending状态过滤
  const pendingConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const pendingResponse =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      pendingConnection,
      {
        communityId,
        body: {
          status: "pending",
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 验证所有返回的邀请状态都是pending
  for (const invitation of pendingResponse.data) {
    TestValidator.equals(
      "invitation status should be pending",
      invitation.status,
      "pending",
    );
  }
  // 4. 测试accepted状态过滤
  const acceptedConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const acceptedResponse =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      acceptedConnection,
      {
        communityId,
        body: {
          status: "accepted",
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(acceptedResponse);
  // 验证所有返回的邀请状态都是accepted
  for (const invitation of acceptedResponse.data) {
    TestValidator.equals(
      "invitation status should be accepted",
      invitation.status,
      "accepted",
    );
  }
  // 5. 测试rejected状态过滤
  const rejectedConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const rejectedResponse =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      rejectedConnection,
      {
        communityId,
        body: {
          status: "rejected",
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // 验证所有返回的邀请状态都是rejected
  for (const invitation of rejectedResponse.data) {
    TestValidator.equals(
      "invitation status should be rejected",
      invitation.status,
      "rejected",
    );
  }
  // 6. 测试expired状态过滤
  const expiredConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const expiredResponse =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      expiredConnection,
      {
        communityId,
        body: {
          status: "expired",
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(expiredResponse);
  // 验证所有返回的邀请状态都是expired
  for (const invitation of expiredResponse.data) {
    TestValidator.equals(
      "invitation status should be expired",
      invitation.status,
      "expired",
    );
  }
  // 7. 测试空状态过滤（返回所有状态）
  const allConnection: api.IConnection = {
    host: connection.host,
    headers: { ...adminConnection.headers },
  };
  const allResponse =
    await api.functional.communityPlatform.admin.communities.invitations.index(
      allConnection,
      {
        communityId,
        body: {
          status: null,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformCommunityInvitation.IRequest,
      },
    );
  typia.assert(allResponse);
  // 验证分页信息
  TestValidator.predicate(
    "records count should be non-negative",
    allResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    allResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    allResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "current page should be non-negative",
    allResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "data length should match pagination",
    allResponse.data.length <= allResponse.pagination.limit,
  );
}
