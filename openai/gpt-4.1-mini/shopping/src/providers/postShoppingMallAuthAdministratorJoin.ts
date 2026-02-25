import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdministratorJoin(props: {
  body: IShoppingMallAdministrator.IJoin;
}): Promise<IShoppingMallAdministrator.IAuthorized> {
  const existing = await MyGlobal.prisma.shopping_mall_administrators.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const nowISO = toISOStringSafe(now) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;
  // Create administrator without nested relation property to avoid Prisma typing error
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        name: "",
        is_super_admin: false,
        // Do not specify administrator_grade relation in create
        created_at: nowISO,
        updated_at: nowISO,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        is_super_admin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator_grade_id: true,
      },
    });
  // Compute session expiration timestamps
  const accessExpiresISO = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  ) satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;
  const refreshExpiresISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  ) satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;
  // Create session correcting foreign key property name
  const session =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.create({
      data: {
        id: v4(),
        administrator_id: administrator.id, // correct FK name
        ip: "", // empty string for nullable
        expired_at: accessExpiresISO,
        created_at: nowISO,
        updated_at: nowISO,
      },
      select: {
        id: true,
        ip: true,
        expired_at: true,
        created_at: true,
      },
    });
  // Get administrator grade record separately
  const administratorGrade = administrator.administrator_grade_id
    ? await MyGlobal.prisma.shopping_mall_administrator_grades.findUniqueOrThrow(
        {
          where: { id: administrator.administrator_grade_id },
        },
      )
    : {
        id: "00000000-0000-0000-0000-000000000000",
        name: "",
        grade: 0,
        super_administrator: false,
      };
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "administrator",
        id: administrator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  // Convert Date fields into ISO string with tags and build response
  return {
    id: administrator.id as string & tags.Format<"uuid">,
    email: administrator.email,
    name: administrator.name,
    isSuperAdmin: administrator.is_super_admin,
    createdAt:
      typeof administrator.created_at === "string"
        ? administrator.created_at
        : (administrator.created_at.toISOString() as string &
            tags.Format<"date-time">),
    updatedAt:
      typeof administrator.updated_at === "string"
        ? administrator.updated_at
        : (administrator.updated_at.toISOString() as string &
            tags.Format<"date-time">),
    deletedAt:
      administrator.deleted_at === null
        ? null
        : typeof administrator.deleted_at === "string"
          ? administrator.deleted_at
          : (administrator.deleted_at.toISOString() as string &
              tags.Format<"date-time">),
    administratorGrade: {
      id: administratorGrade.id as string & tags.Format<"uuid">,
      name: administratorGrade.name,
      grade: administratorGrade.grade as number & tags.Type<"int32">,
      superAdministrator: administratorGrade.super_administrator,
    },
    token,
  } satisfies IShoppingMallAdministrator.IAuthorized;
}
