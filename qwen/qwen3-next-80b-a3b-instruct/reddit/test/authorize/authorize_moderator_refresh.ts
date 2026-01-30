import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
export async function authorize_moderator_refresh(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsModerator.IRefresh;
  },
): Promise<ICommunityBbsModerator.IAuthorized> {
  return await api.functional.communityBbs.auth.moderator.refresh(connection, {
    body: props.body,
  });
}
