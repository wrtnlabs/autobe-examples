import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOwnerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerPasswordResets(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingOwnerPasswordReset.ICreate;
}): Promise<IHrmTimeTrackingOwnerPasswordReset> {
  const normalizedEmail = props.body.email.trim().toLowerCase();
  const nowDate = new Date();
  const expiredDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const nowIso = toISOStringSafe(nowDate);
  const expiredIso = toISOStringSafe(expiredDate);
  const buildAccepted = (input: {
    id: string & tags.Format<"uuid">;
    actorType: "owner" | "manager" | "employee";
    expired_at: string & tags.Format<"date-time">;
    used_at: (string & tags.Format<"date-time">) | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: (string & tags.Format<"date-time">) | null;
  }): IHrmTimeTrackingOwnerPasswordReset => ({
    id: input.id,
    actorType: input.actorType,
    expired_at: input.expired_at,
    used_at: input.used_at,
    created_at: input.created_at,
    updated_at: input.updated_at,
    deleted_at: input.deleted_at,
  });
  const createGenericAccepted = (
    actorType: "owner" | "manager" | "employee",
  ): IHrmTimeTrackingOwnerPasswordReset => {
    const generatedId: string & tags.Format<"uuid"> = typia.assert<
      string & tags.Format<"uuid">
    >(v4());
    return buildAccepted({
      id: generatedId,
      actorType,
      expired_at: expiredIso,
      used_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    });
  };
  const issueToken = (
    actor: "owner" | "manager" | "employee",
    subjectId: string & tags.Format<"uuid">,
  ): string =>
    jwt.sign(
      {
        jti: v4(),
        sub: subjectId,
        type: "password-reset",
        actor,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h" },
    );
  if (props.body.actor === "owner") {
    const owner = await MyGlobal.prisma.hrm_time_tracking_owners.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, deleted_at: true, deactivated_at: true },
    });
    if (
      owner === null ||
      owner.deleted_at !== null ||
      owner.deactivated_at !== null
    ) {
      return createGenericAccepted("owner");
    }
    for (let attempt = 0; attempt < 3; ++attempt) {
      const createdId = typia.assert<string & tags.Format<"uuid">>(v4());
      const token = issueToken("owner", owner.id);
      try {
        const created = await MyGlobal.prisma.$transaction(async (tx) => {
          const record =
            await tx.hrm_time_tracking_owner_password_resets.create({
              data: {
                id: createdId,
                owner: { connect: { id: owner.id } },
                token,
                expired_at: new Date(expiredIso),
                used_at: null,
                created_at: new Date(nowIso),
                updated_at: new Date(nowIso),
                deleted_at: null,
              },
              select: {
                id: true,
                expired_at: true,
                used_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            });
          if (token.length === 0) {
            throw new HttpException("Password reset delivery failed", 500);
          }
          return record;
        });
        return buildAccepted({
          id: created.id,
          actorType: "owner",
          expired_at: toISOStringSafe(created.expired_at),
          used_at:
            created.used_at === null ? null : toISOStringSafe(created.used_at),
          created_at: toISOStringSafe(created.created_at),
          updated_at: toISOStringSafe(created.updated_at),
          deleted_at:
            created.deleted_at === null
              ? null
              : toISOStringSafe(created.deleted_at),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new HttpException("Password reset request could not be created", 500);
  }
  if (props.body.actor === "manager") {
    const manager = await MyGlobal.prisma.hrm_time_tracking_managers.findUnique(
      {
        where: { email: normalizedEmail },
        select: { id: true, deleted_at: true },
      },
    );
    if (manager === null || manager.deleted_at !== null) {
      return createGenericAccepted("manager");
    }
    for (let attempt = 0; attempt < 3; ++attempt) {
      const createdId = typia.assert<string & tags.Format<"uuid">>(v4());
      const token = issueToken("manager", manager.id);
      try {
        const created = await MyGlobal.prisma.$transaction(async (tx) => {
          const record =
            await tx.hrm_time_tracking_manager_password_resets.create({
              data: {
                id: createdId,
                manager: { connect: { id: manager.id } },
                token,
                expired_at: new Date(expiredIso),
                consumed_at: null,
                created_at: new Date(nowIso),
                updated_at: new Date(nowIso),
                deleted_at: null,
              },
              select: {
                id: true,
                expired_at: true,
                consumed_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            });
          if (token.length === 0) {
            throw new HttpException("Password reset delivery failed", 500);
          }
          return record;
        });
        return buildAccepted({
          id: created.id,
          actorType: "manager",
          expired_at: toISOStringSafe(created.expired_at),
          used_at:
            created.consumed_at === null
              ? null
              : toISOStringSafe(created.consumed_at),
          created_at: toISOStringSafe(created.created_at),
          updated_at: toISOStringSafe(created.updated_at),
          deleted_at:
            created.deleted_at === null
              ? null
              : toISOStringSafe(created.deleted_at),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new HttpException("Password reset request could not be created", 500);
  }
  if (props.body.actor === "employee") {
    const employee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, deleted_at: true },
      });
    if (employee === null || employee.deleted_at !== null) {
      return createGenericAccepted("employee");
    }
    for (let attempt = 0; attempt < 3; ++attempt) {
      const createdId = typia.assert<string & tags.Format<"uuid">>(v4());
      const token = issueToken("employee", employee.id);
      try {
        const created = await MyGlobal.prisma.$transaction(async (tx) => {
          const record =
            await tx.hrm_time_tracking_employee_password_resets.create({
              data: {
                id: createdId,
                employee: { connect: { id: employee.id } },
                token,
                used_at: null,
                expired_at: new Date(expiredIso),
                created_at: new Date(nowIso),
                updated_at: new Date(nowIso),
              },
              select: {
                id: true,
                expired_at: true,
                used_at: true,
                created_at: true,
                updated_at: true,
              },
            });
          if (token.length === 0) {
            throw new HttpException("Password reset delivery failed", 500);
          }
          return record;
        });
        return buildAccepted({
          id: created.id,
          actorType: "employee",
          expired_at: toISOStringSafe(created.expired_at),
          used_at:
            created.used_at === null ? null : toISOStringSafe(created.used_at),
          created_at: toISOStringSafe(created.created_at),
          updated_at: toISOStringSafe(created.updated_at),
          deleted_at: null,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new HttpException("Password reset request could not be created", 500);
  }
  throw new HttpException("Unsupported actor type", 400);
}
