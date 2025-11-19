import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function postDiscussionBoardRegisteredUsers(props: {
  body: IDiscussionBoardRegisteredUser.ICreate;
}): Promise<IDiscussionBoardRegisteredUser> {
  try {
    const parsedBody = JSON.parse(props.body);
    if (
      !(
        "email" in parsedBody &&
        "password" in parsedBody &&
        "name" in parsedBody
      )
    ) {
      throw new HttpException("Invalid input format", 400);
    }

    const existing =
      await MyGlobal.prisma.discussion_board_registered_users.findUnique({
        where: { email: parsedBody.email },
      });
    if (existing) {
      throw new HttpException("Email already exists", 409);
    }

    const hashedPassword = await PasswordUtil.hash(parsedBody.password);
    const newUser =
      await MyGlobal.prisma.discussion_board_registered_users.create({
        data: {
          id: v4() satisfies string & tags.Format<"uuid">,
          email: parsedBody.email,
          username: parsedBody.email,
          password_hash: hashedPassword,
          is_active: true,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });

    return {
      id: newUser.id satisfies string & tags.Format<"uuid">,
      email: newUser.email,
      name: parsedBody.name,
    } satisfies IDiscussionBoardRegisteredUser;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Email already exists", 409);
      }
    }
    throw new HttpException("Failed to create user", 500);
  }
}
