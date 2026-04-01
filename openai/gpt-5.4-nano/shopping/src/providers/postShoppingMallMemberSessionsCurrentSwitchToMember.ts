import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSession";
import { IShoppingMallMemberSessionSwitchToMemberRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberSessionSwitchToMemberRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberSessionsCurrentSwitchToMember(props: {
  member: MemberPayload;
  body: IShoppingMallMemberSessionSwitchToMemberRequest;
}): Promise<IShoppingMallMemberSession> {
  return await (async (): Promise<IShoppingMallMemberSession> => {
    const now = Date.now();
    void now;
    throw new HttpException("Not implemented", 501);
  })();
}
