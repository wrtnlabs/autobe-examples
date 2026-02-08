import { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserPasswordResets(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUserPasswordReset.ISummary> {
  // Authorization: Only administrators or superadministrators may access
  // Since registeredUser.type is 'registereduser', reject all
  throw new HttpException("Forbidden", 403);
}
