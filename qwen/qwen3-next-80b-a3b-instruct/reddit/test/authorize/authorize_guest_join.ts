import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsGuest";
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body: ICommunityBbsGuest.IJoin;
  },
): Promise<ICommunityBbsGuest.IAuthorized> {
  return await api.functional.communityBbs.auth.guest.join(connection, {
    body: props.body,
  });
}
