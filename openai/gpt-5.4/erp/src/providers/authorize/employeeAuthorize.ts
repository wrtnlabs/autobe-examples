import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { EmployeePayload } from "../../decorators/payload/EmployeePayload";
import { jwtAuthorize } from "./jwtAuthorize";

export async function employeeAuthorize(request: {
  headers: { authorization?: string };
}): Promise<EmployeePayload> {
  const payload: EmployeePayload = jwtAuthorize({ request }) as EmployeePayload;

  if (payload.type !== "employee") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      sessions: {
        some: {
          id: payload.session_id,
          logged_out_at: null,
          expired_at: {
            gt: new Date(),
          },
        },
      },
    },
  });

  if (employee === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
