import { ForbiddenException } from "@nestjs/common";
import { MemberPayload } from "../../decorators/payload/MemberPayload";
import { jwtAuthorize } from "./jwtAuthorize";

declare const globalThis: typeof global & {
  MyGlobal?: {
    prisma: {
      todo_app_members: {
        findFirst(args: {
          where: {
            id: string;
            deleted_at: null;
            sessions: {
              some: {
                id: string;
                expired_at: {
                  gt: Date;
                };
              };
            };
          };
        }): Promise<unknown | null>;
      };
    };
  };
};

export async function memberAuthorize(request: {
  headers: { authorization?: string };
}): Promise<MemberPayload> {
  const payload: MemberPayload = jwtAuthorize({ request }) as MemberPayload;

  if (payload.type !== "member") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const prisma = globalThis.MyGlobal?.prisma;
  if (prisma === undefined)
    throw new ForbiddenException("You're not enrolled");

  const member = await prisma.todo_app_members.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      sessions: {
        some: {
          id: payload.session_id,
          expired_at: {
            gt: new Date(),
          },
        },
      },
    },
  });

  if (member === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
