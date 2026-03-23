import { tags } from "typia";

export namespace IHrmTrackerAnalytic {
  /**
   * Statistics for employee distribution across status and employment type.
   */
  export type IEmployeeStatistic = {
    /**
     * Employee status category.
     *
     * @x-autobe-specification Aggregation result: GROUP BY status column from hrm_tracker_employees. Status value represents employee status from the organization's employee records.
     */
    status: string;

    /**
     * Employment type category.
     *
     * @x-autobe-specification Aggregation result: GROUP BY employment_type column from hrm_tracker_employees. Employment type value represents the employment type from the organization's employee records.
     */
    employmentType: string;

    /**
     * Number of employees in this status and employment type combination.
     *
     * @x-autobe-specification Aggregation result: COUNT(*) from hrm_tracker_employees grouped by status and employment_type. Represents the number of employees matching each status-employmentType combination.
     */
    count: number & tags.Type<"int32">;
  };

  /**
   * Optional filters for analytics aggregation. No fields defined. All optional.
   */
  export type IEmployeeStatisticsRequest = {};
}
