import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_erase_removes_from_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1) 회원 가입(멤버 컨텍스트 생성)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) 커뮤니티 생성
  const created: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<ICommunityPlatformCommunity.ICreate["name"]>(),
          description:
            typia.random<ICommunityPlatformCommunity.ICreate["description"]>(),
          icon_href:
            typia.random<ICommunityPlatformCommunity.ICreate["icon_href"]>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(created);
  // 3) (사전 확인) 삭제 대상이 존재하는지 상세 조회
  const detailBefore: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.communities.at(memberConnection, {
      communityId: created.id,
    });
  typia.assert(detailBefore);
  TestValidator.equals(
    "community name matches before deletion",
    detailBefore.name,
    created.name,
  );
  TestValidator.equals(
    "community description matches before deletion",
    detailBefore.description,
    created.description,
  );
  TestValidator.equals(
    "community iconHref matches before deletion",
    detailBefore.iconHref,
    created.iconHref,
  );
  // 4) 커뮤니티 삭제
  await api.functional.communityPlatform.communities.erase(memberConnection, {
    communityId: created.id,
  });
  // 5) 삭제 후 즉시 상세 조회 불가(미존재/이용불가)
  await TestValidator.error(
    "community should be unavailable after erase",
    async () => {
      await api.functional.communityPlatform.communities.at(memberConnection, {
        communityId: created.id,
      });
    },
  );
}
