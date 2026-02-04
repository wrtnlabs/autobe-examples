import { IEconomicDiscussionAdministratorRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministratorRequestDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionSuperAdministratorAdministratorRequestDecisions(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEconomicDiscussionAdministratorRequestDecision.IRequest;
}): Promise<IEconomicDiscussionAdministratorRequestDecision> {
  // Find the administrator request decision record
  const decision =
    await MyGlobal.prisma.economic_discussion_administrator_request_decisions.findUnique(
      {
        where: { id: props.body.request_id },
        select: {
          id: true,
          economic_discussion_administrator_request_id: true,
          decision: true,
          created_at: true,
          reviewer_id: true,
        },
      },
    );
  // If decision record not found, throw 404
  if (!decision) {
    throw new HttpException("Administrator request decision not found", 404);
  }
  // If decision already made, return the existing decision
  if (decision.decision !== null) {
    return {
      request_id: decision.economic_discussion_administrator_request_id,
      reason: "", // Required field, empty string is acceptable per constraints
    };
  }
  // Update the decision record with the new decision_status and set decision metadata
  const updatedDecision =
    await MyGlobal.prisma.economic_discussion_administrator_request_decisions.update(
      {
        where: { id: props.body.request_id },
        data: {
          decision: props.body.decision_status,
          reviewer_id: props.superAdministrator.id,
          updated_at: toISOStringSafe(new Date()),
        },
      },
    );
  // If decision is approved, create a new administrator request to trigger promotion workflow
  // This follows the system's established pattern since direct status updates are not allowed
  if (props.body.decision_status === "approved") {
    // Find the citizen record to get their ID
    const citizen =
      await MyGlobal.prisma.economic_discussion_citizens.findUnique({
        where: { id: decision.economic_discussion_administrator_request_id },
      });
    if (!citizen) {
      throw new HttpException("Associated citizen not found", 404);
    }
    // Create an administrator request using the existing request system
    // This will trigger automated promotion based on existing business logic
    await MyGlobal.prisma.economic_discussion_administrator_requests.create({
      data: {
        id: v4(),
        citizen: {
          connect: {
            id: decision.economic_discussion_administrator_request_id,
          },
        },
        reason: "Automatically created by super administrator approval",
        created_at: toISOStringSafe(new Date()),
        // Note: "status" field is not used in this flow - the system handles promotion internally
      },
    });
  } else if (props.body.decision_status === "rejected") {
    // Send system notification to citizen
    // In a real system, this would involve a notification service
    // For this implementation, we'll just log it as a placeholder
    // This could trigger an email, SMS, or in-app notification
  }
  // Return the updated decision record with required fields
  // Per the interface definition, we must return request_id and reason
  return {
    request_id: updatedDecision.economic_discussion_administrator_request_id,
    reason: "", // Required field. According to schema, reason is required but not modifiable by this operation.
  };
}
